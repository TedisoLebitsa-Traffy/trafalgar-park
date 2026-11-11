#!/usr/bin/env python3
"""Create original, text-free prop and board diagrams for illustrated quiz questions."""
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/clue-symbols'
NAVY, GOLD, RED, BLUE, GREEN = '#102750', '#e4ac28', '#9a2846', '#3096d2', '#45a477'

def circle(x,y,r,fill,stroke='none',width=4):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'
def rect(x,y,w,h,fill,rx=8,stroke='none',width=5):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'
def line(x1,y1,x2,y2,stroke=NAVY,width=8):
    return f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{stroke}" stroke-width="{width}" fill="none" stroke-linecap="round"/>'
def path(d,fill,stroke='none',width=5):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round"/>'
def polygon(points,fill,stroke='none',width=5):
    return f'<polygon points="{points}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round"/>'
def star(cx,cy,r,colour=GOLD):
    pts=[]
    for i in range(10):
        a=-math.pi/2+i*math.pi/5;rr=r if i%2==0 else r*.43;pts.append(f'{cx+rr*math.cos(a):.1f},{cy+rr*math.sin(a):.1f}')
    return polygon(' '.join(pts),colour,NAVY,3)
def face(colour=BLUE):
    return circle(400,300,125,colour,NAVY)+circle(355,280,15,'white')+circle(445,280,15,'white')+circle(357,282,7,NAVY)+circle(443,282,7,NAVY)+path('M350 335 Q400 380 450 335', 'none', NAVY,8)
def heart(x,y,s,colour):
    return f'<g transform="translate({x} {y}) scale({s})">'+path('M0 20 C-65 -30 -95 55 0 115 C95 55 65 -30 0 20',colour,NAVY,3)+'</g>'
def board_grid(cols,rows):
    x,y=160,110;w,h=480,360
    result=rect(x-25,y-25,w+50,h+50,'#d9b681',16,NAVY)
    for c in range(cols):result+=line(x+c*w/(cols-1),y,x+c*w/(cols-1),y+h,NAVY,3)
    for r in range(rows):result+=line(x,y+r*h/(rows-1),x+w,y+r*h/(rows-1),NAVY,3)
    for c,r,k in [(0,0,RED),(1,0,RED),(cols-1,rows-1,BLUE),(cols-2,rows-1,BLUE),(2,2,RED),(cols-2,1,BLUE)]:
        result+=circle(x+c*w/(cols-1),y+r*h/(rows-1),14,k,'white',2)
    return result

def draw(name):
    if name=='book':
        return path('M125 155 Q270 110 400 165 Q530 110 675 155 L675 450 Q525 405 400 460 Q270 405 125 450 Z',BLUE,NAVY)+path('M145 150 Q280 125 400 180 L400 435 Q275 385 145 420 Z','white')+path('M655 150 Q525 125 400 180 L400 435 Q525 385 655 420 Z','#fff8dd')+line(400,180,400,435,NAVY,4)+''.join(line(180,220+i*40,335,220+i*40,'#b6c7d7',3)+line(465,220+i*40,620,220+i*40,'#b6c7d7',3) for i in range(4))
    if name=='sword':
        return polygon('380,90 420,90 440,360 400,395 360,360','#d4e4ed',NAVY)+line(400,100,400,365,'white',5)+rect(305,365,190,28,GOLD,8,NAVY)+rect(385,395,30,100,RED,7,NAVY)+circle(400,510,25,GOLD,NAVY)
    if name in ['mask','ninja']:
        colors=[GREEN,BLUE,GOLD] if name=='ninja' else [NAVY]
        result=''
        for i,col in enumerate(colors):
            x=400+(i-(len(colors)-1)/2)*205
            result+=circle(x,290,90,col,NAVY)+rect(x-80,265,160,40,'#f2d3ac',15)+path(f'M{x-55} 285 Q{x-35} 270 {x-15} 285 M{x+15} 285 Q{x+35} 270 {x+55} 285','none',NAVY,7)
        return result
    if name in ['robot','alien','monster','yellow-monster','red-monster','purple-monster','blue-monster']:
        if name=='robot':return rect(260,160,280,250,'#95aabd',35,NAVY)+rect(290,215,220,70,NAVY,10)+circle(340,250,20,GOLD)+circle(460,250,20,GOLD)+rect(330,335,140,30,'white',5,NAVY)+line(400,160,400,105)+circle(400,95,17,RED)+rect(215,240,45,95,GOLD,10,NAVY)+rect(540,240,45,95,GOLD,10,NAVY)
        col={'alien':'#54aeaa','yellow-monster':GOLD,'red-monster':'#d34857','purple-monster':'#b769b6','blue-monster':BLUE,'monster':'#67b989'}[name]
        return polygon('290,190 255,115 350,155',col,NAVY)+polygon('450,155 545,115 510,190',col,NAVY)+face(col)+circle(350,425,35,col,NAVY)+circle(450,425,35,col,NAVY)
    if name=='science':return path('M230 120 L310 120 L310 270 L385 440 Q385 465 355 465 L175 465 Q145 465 160 430 L230 270 Z','#d9eff8',NAVY)+path('M200 355 L330 355 L365 440 L180 440 Z',BLUE)+rect(450,150,85,290,'#d9eff8',20,NAVY)+rect(458,290,69,140,GREEN,15)+circle(265,325,13,'white')+circle(495,260,12,'white')+circle(555,180,12,GOLD)
    if name=='sunglasses':return rect(180,230,190,125,NAVY,35)+rect(430,230,190,125,NAVY,35)+path('M370 270 Q400 235 430 270','none',NAVY,18)+line(180,245,135,210)+line(620,245,665,210)+line(220,270,265,250,'#9bd1e9',9)+line(470,270,515,250,'#9bd1e9',9)
    if name in ['three-hearts','blue-heart','green-heart']:
        return ''.join(heart(x,230,1,col) for x,col in ([(230,RED),(400,BLUE),(570,GREEN)] if name=='three-hearts' else [(400,BLUE if name=='blue-heart' else GREEN)]))
    if name=='pink-star':return star(400,300,150,'#ee9abd')+circle(365,290,10,NAVY)+circle(435,290,10,NAVY)
    if name=='star':return star(400,300,170)
    if name=='magic':return line(240,440,510,170,NAVY,20)+star(530,150,65)+star(610,280,28,BLUE)+star(310,170,26,RED)+star(430,405,32,GREEN)
    if name in ['cards','sweets','blocks']:
        if name=='sweets':return ''.join(circle(x,y,r,c,NAVY) for x,y,r,c in [(270,300,90,RED),(435,255,88,BLUE),(550,365,85,GOLD)])+''.join(circle(x,y,22,'white') for x,y in [(250,270),(420,225),(530,335)])
        if name=='blocks':return ''.join(rect(180+c*90,440-r*85,84,80,col,6,NAVY,3) for r,cs,col in [(0,range(5),BLUE),(1,range(3),RED),(2,range(1,3),GOLD),(3,range(2,4),GREEN)] for c in cs)
        return ''.join(f'<g transform="rotate({a} 400 300)">'+rect(300,150,200,300,'white',15,NAVY)+(''.join(heart(x,y,.3,RED) for x,y in [(350,210),(450,335)]) if i%2 else star(400,300,60))+'</g>' for i,a in enumerate([-22,0,22]))
    if name=='top':return path('M240 280 Q400 175 560 280 L400 465 Z',RED,NAVY)+path('M240 280 Q400 360 560 280',GOLD,NAVY)+line(400,160,400,250,NAVY,18)+path('M200 220 Q400 90 600 220','none',BLUE,8)
    if name=='clover':return ''.join(f'<g transform="rotate({a} 400 280)">'+heart(400,245,.75,GREEN)+'</g>' for a in [0,90,180,270])+path('M400 300 Q450 430 380 490','none',GREEN,18)
    if name=='moon':return path('M470 115 C245 105 205 425 440 470 C325 400 330 220 470 115 Z',GOLD,NAVY)+star(560,235,35)+star(260,130,22)+star(565,400,24)
    if name in ['red-bow','blue-bow','headband']:
        col=RED if name!='blue-bow' else BLUE
        if name=='headband':return rect(190,230,420,85,col,15,NAVY)+path('M590 290 L660 430 L585 400 L560 300',col,NAVY)+circle(400,270,28,'white',NAVY)
        return path('M370 270 L200 170 Q140 300 200 420 L370 330 Z',col,NAVY)+path('M430 270 L600 170 Q660 300 600 420 L430 330 Z',col,NAVY)+rect(360,260,80,85,col,20,NAVY)
    if name in ['red-cap','blue-cap','green-hat','cowboy-hat','hood','witch','helmet']:
        if name=='green-hat':return path('M235 390 Q330 110 610 170 Q420 230 455 390 Z',GREEN,NAVY)+rect(205,360,310,55,GREEN,12,NAVY)
        if name=='witch':return path('M230 390 L380 105 L505 390 Z',NAVY)+path('M140 410 Q400 315 650 410 Q400 490 140 410',NAVY)+rect(265,340,205,35,RED)+line(230,475,610,140,'#946132',15)
        if name=='cowboy-hat':return path('M170 350 Q260 415 315 330 L330 165 Q400 215 470 165 L490 330 Q545 410 640 350 Q640 465 400 445 Q165 445 170 350', '#ad743c',NAVY)
        if name=='hood':return path('M220 440 L250 245 Q400 35 550 245 L580 440 Z',NAVY)+path('M310 370 L330 245 Q400 140 470 245 L490 370 Z','#f4dfbc')
        if name=='helmet':return circle(400,290,165,'#dfeaf0',NAVY)+rect(275,205,250,170,NAVY,55)+path('M310 245 L370 225','none','#91cde4',16)+rect(335,405,130,45,GOLD,8,NAVY)
        col=RED if name=='red-cap' else BLUE
        return path('M235 330 Q220 120 400 130 Q580 120 565 330 Z',col,NAVY)+path('M220 335 Q400 270 650 350 Q630 405 430 380 Z',col,NAVY)
    if name in ['house','treehouse','tower','school','door']:
        if name=='door':return rect(250,95,300,430,'#e1c187',12,NAVY)+rect(280,120,240,370,BLUE,6,NAVY)+circle(485,320,12,GOLD)
        result=''
        if name=='treehouse':result+=rect(365,260,70,280,'#92714e',6)+circle(280,210,100,GREEN)+circle(465,170,130,GREEN)+circle(580,250,100,GREEN)
        if name=='tower':return rect(295,180,210,330,'#9eb8ce',4,NAVY)+''.join(rect(275+i*70,130,50,90,'#9eb8ce',3,NAVY) for i in range(4))+path('M355 510 L355 410 Q400 360 445 410 L445 510',NAVY)+rect(370,240,60,90,'#f9f3d9',20,NAVY)
        result+=rect(230,245,340,235,'#f9d58f',10,NAVY)+polygon('180,250 400,90 620,250',RED,NAVY)+rect(360,355,80,125,BLUE,8,NAVY)+rect(260,300,65,65,'white',4,NAVY)+rect(475,300,65,65,'white',4,NAVY)
        if name=='school':result+=circle(400,205,35,'white',NAVY)+line(400,205,400,180,NAVY,4)+line(400,205,418,215,NAVY,4)
        return result
    if name in ['pot','honey','coins']:
        if name=='pot':return rect(245,235,310,240,'#8099ad',35,NAVY)+line(215,270,245,270,NAVY,20)+line(555,270,585,270,NAVY,20)+path('M230 230 Q400 150 570 230 Z',GOLD,NAVY)+circle(400,185,18,NAVY)
        if name=='honey':return path('M290 175 L510 175 L530 445 Q400 505 270 445 Z',GOLD,NAVY)+rect(280,145,240,55,'#976d37',12,NAVY)+path('M285 235 Q330 275 345 245 Q370 205 395 255 Q420 290 435 250 Q475 220 515 245','none','#fff4c0',18)
        return ''.join(rect(x,y,120,25,GOLD,13,NAVY,3) for x,h in [(200,3),(350,5),(500,8)] for y in [475-i*25 for i in range(h)])
    if name in ['gem','ring','crown','badge','lamp','shoe']:
        if name=='gem':return polygon('280,170 520,170 620,280 400,485 180,280',BLUE,NAVY)+path('M280 170 L300 280 L400 485 L500 280 L520 170 M180 280 L620 280 M300 280 L400 170 L500 280','none','white',5)
        if name=='ring':return circle(400,300,140,GOLD,NAVY)+circle(400,300,95,'#f5f4e8',NAVY)
        if name=='crown':return polygon('200,190 300,280 400,145 500,280 600,190 555,440 245,440',GOLD,NAVY)+''.join(circle(x,200 if x!=400 else 135,20,RED,NAVY) for x in [195,400,605])+rect(245,405,310,40,RED,5,NAVY)
        if name=='badge':return star(400,300,165,GOLD)+circle(400,300,62,BLUE,NAVY)
        if name=='lamp':return path('M240 300 Q290 160 475 235 Q520 260 555 235 L655 190 Q625 320 520 330 Q480 430 300 400 Q240 370 240 300 Z',GOLD,NAVY)+path('M240 285 Q105 180 170 355 Q190 380 255 355','none',GOLD,30)+rect(310,420,200,30,GOLD,8,NAVY)+path('M515 190 Q560 90 620 160 Q655 210 700 140','none',BLUE,10)
        return path('M180 375 Q330 400 405 240 Q430 330 520 355 L620 400 L610 450 L180 450 Z','#cae7f1',NAVY)+path('M520 415 L545 505 L570 505 L580 430',GOLD,NAVY)
    if name in ['snowflake','snowman','fairy','puppet','ghost']:
        if name=='snowflake':return ''.join(f'<g transform="rotate({a} 400 300)">'+line(400,300,400,120,BLUE,12)+line(400,185,365,150,BLUE,8)+line(400,185,435,150,BLUE,8)+'</g>' for a in range(0,360,60))
        if name=='snowman':return circle(400,395,105,'white',NAVY)+circle(400,255,78,'white',NAVY)+circle(400,150,53,'white',NAVY)+circle(382,140,7,NAVY)+circle(418,140,7,NAVY)+polygon('405,155 480,175 405,180','#e98c35')+line(330,280,225,220,'#936735')+line(470,280,575,220,'#936735')+rect(338,185,125,30,RED,4)
        if name=='fairy':return path('M380 245 Q180 110 220 330 Q230 420 390 300 M420 245 Q620 110 580 330 Q570 420 410 300', '#a1d5e6',NAVY)+circle(400,180,48,'#edc6a2',NAVY)+polygon('400,225 305,405 495,405',GREEN,NAVY)+line(365,400,350,505)+line(435,400,450,505)+line(440,260,550,210)+star(560,200,25)
        if name=='ghost':return path('M240 470 L240 245 Q240 90 400 90 Q560 90 560 245 L560 470 L505 435 L450 470 L400 435 L350 470 L295 435 Z','white',NAVY)+circle(350,255,20,NAVY)+circle(450,255,20,NAVY)+circle(400,340,25,NAVY)
        return circle(400,210,55,'#dbb180',NAVY)+rect(340,270,120,140,'#c28952',15,NAVY)+line(350,290,260,390,'#c28952',25)+line(450,290,540,390,'#c28952',25)+line(365,410,330,490,'#c28952',25)+line(435,410,470,490,'#c28952',25)+line(400,80,400,150,'#8d9bad',3)+line(270,80,260,380,'#8d9bad',3)+line(530,80,540,380,'#8d9bad',3)+line(260,80,540,80,NAVY,12)
    if name=='lightning':return polygon('420,95 230,335 365,335 320,505 565,235 430,235 480,95',GOLD,NAVY)
    if name=='skull':return circle(400,260,125,'#f7f0d8',NAVY)+rect(325,330,150,105,'#f7f0d8',20,NAVY)+circle(350,255,35,NAVY)+circle(450,255,35,NAVY)+polygon('400,290 380,330 420,330',NAVY)+''.join(line(x,365,x,415,NAVY,4) for x in range(350,451,25))
    if name=='emotion':return ''.join(circle(x,y,55,c,NAVY)+circle(x-18,y-10,5,NAVY)+circle(x+18,y-10,5,NAVY)+path(f'M{x-25} {y+15} Q{x} {y+40 if i%2==0 else y} {x+25} {y+15}','none',NAVY,4) for i,(x,y,c) in enumerate([(250,230,GOLD),(400,190,BLUE),(550,230,RED),(325,390,GREEN),(490,390,'#a278bc')]))
    if name=='maze':return path('M400 180 A120 120 0 1 0 400 420 L400 300 Z',GOLD,NAVY)+''.join(circle(x,300,12,GOLD) for x in [455,515,575,635])
    if name=='portal':return '<ellipse cx="260" cy="300" rx="95" ry="170" fill="#b8e2f4" stroke="#228bd0" stroke-width="18"/><ellipse cx="540" cy="300" rx="95" ry="170" fill="#ffdfab" stroke="#dc8626" stroke-width="18"/>'+line(360,300,435,300,NAVY,8)
    if name=='spaceship':return path('M400 75 Q535 230 485 420 L315 420 Q265 230 400 75 Z','#d9e7ee',NAVY)+circle(400,260,65,BLUE,NAVY)+polygon('315,340 230,440 315,420',RED,NAVY)+polygon('485,340 570,440 485,420',RED,NAVY)+polygon('350,425 400,540 450,425',GOLD)
    if name=='compass':return circle(400,300,175,GOLD,NAVY)+circle(400,300,145,'white',NAVY)+polygon('400,165 435,300 400,435 365,300',RED,NAVY)+polygon('265,300 400,265 535,300 400,335',BLUE,NAVY)+circle(400,300,17,GOLD,NAVY)
    if name=='biohazard':return ''.join(f'<g transform="rotate({a} 400 300)">'+path('M355 280 C220 255 250 95 360 110 C280 170 310 210 375 225 Z',NAVY)+'</g>' for a in [0,120,240])+circle(400,300,32,RED)
    if name=='film':return rect(240,190,330,250,NAVY,15)+circle(310,150,70,BLUE,NAVY)+circle(485,150,70,GOLD,NAVY)+polygon('570,255 675,195 675,425 570,365',RED,NAVY)+line(400,440,330,535,NAVY,14)+line(400,440,470,535,NAVY,14)
    if name=='television':return rect(180,165,440,300,NAVY,30)+rect(215,195,320,235,'#b4d8e9',22)+circle(575,245,18,GOLD)+circle(575,310,18,GOLD)+line(320,165,265,95)+line(480,165,535,95)+line(240,465,225,500)+line(560,465,575,500)
    if name=='palette':return path('M210 360 Q125 160 380 110 Q635 85 655 310 Q660 440 540 455 Q455 470 440 385 Q405 310 340 405 Q275 495 210 360 Z','#c49a68',NAVY)+''.join(circle(x,y,32,c) for x,y,c in [(275,210,RED),(395,170,BLUE),(530,205,GOLD),(585,315,GREEN)])+line(250,470,540,310,NAVY,18)
    if name=='crowbar':return path('M270 460 L455 180 Q490 125 550 160 L560 200 L515 195 L315 485 Z','#768fa4',NAVY)
    if name.startswith('mancala-'):
        rows,cols=(4,8) if name.endswith('four') else (2,7 if name.endswith('seven') else 6)
        result=rect(95,100,610,410,'#c59660',35,NAVY)
        for y in range(rows):
            for x in range(cols):
                xx=145+x*510/(cols-1);yy=155+y*300/(rows-1);result+=circle(xx,yy,24,'#755431',NAVY,2)
                for a,b in [(-7,-5),(7,4),(-4,10)]:result+=circle(xx+a,yy+b,5,GOLD)
        return result
    if name in ['grid-six-five','grid-five','grid-three','fanorona']:
        cols,rows={'grid-six-five':(6,5),'grid-five':(5,5),'grid-three':(3,3),'fanorona':(9,5)}[name]
        result=board_grid(cols,rows)
        if name=='fanorona':
            for r in range(rows-1):
                for c in range(cols-1):
                    if (r+c)%2==0:result+=line(160+c*60,110+r*90,160+(c+1)*60,110+(r+1)*90,NAVY,2)
                    else:result+=line(160+(c+1)*60,110+r*90,160+c*60,110+(r+1)*90,NAVY,2)
        return result
    if name=='shisima':
        pts=[(400+190*math.cos(i*math.pi/4),300+190*math.sin(i*math.pi/4)) for i in range(8)]
        result=polygon(' '.join(f'{x:.1f},{y:.1f}' for x,y in pts),'#dfbe87',NAVY)
        for i,(x,y) in enumerate(pts):result+=line(x,y,400,300,NAVY,3)+circle(x,y,16,RED if i<3 else BLUE if i>4 else '#dfbe87',NAVY,2)
        return result+circle(400,300,17,GOLD,NAVY)
    if name=='shax':return ''.join(rect(400-r,300-r,2*r,2*r,'none',0,NAVY,4) for r in [85,140,195])+''.join(line(*a,NAVY,4) for a in [(400,105,400,215),(400,385,400,495),(205,300,315,300),(485,300,595,300)])+''.join(circle(x,y,15,c,NAVY,2) for x,y,c in [(205,105,RED),(400,105,RED),(595,300,BLUE),(260,440,BLUE)])
    if name in ['sticks','three-sticks']:
        return (line(220,140,550,460,'#a87740',26)+line(560,140,245,460,'#b98b53',26)) if name=='sticks' else ''.join(line(180,y,620,y,'#a87740',22) for y in [180,300,440])
    if name=='stones':return '<ellipse cx="400" cy="345" rx="170" ry="100" fill="#c4a984" stroke="#71583e" stroke-width="6"/>'+''.join(circle(x,y,r,'#71899b',NAVY,2) for x,y,r in [(340,330,27),(410,350,29),(465,320,25),(400,125,32),(565,450,24)])+path('M400 230 L400 190 M370 210 L400 180 L430 210','none',GOLD,6)
    if name=='jukskei':return line(200,440,630,440,GREEN,9)+path('M245 410 L280 210 L330 190 L345 225 L310 245 L285 420 Z','#bd8a4d',NAVY)+path('M460 410 L500 170 L550 145 L570 185 L530 215 L505 420 Z','#bd8a4d',NAVY)
    if name in ['feet','wrestling']:
        if name=='feet':return path('M250 130 L330 130 L330 340 Q410 390 360 450 L225 450 Q190 400 245 350 Z',BLUE,NAVY)+path('M470 190 L550 190 L550 370 Q625 410 580 465 L435 465 Q400 425 465 375 Z',RED,NAVY)+line(200,500,620,500,GREEN,5)
        return circle(290,150,38,BLUE,NAVY)+circle(500,150,38,RED,NAVY)+line(300,200,350,340,BLUE,42)+line(490,200,440,340,RED,42)+line(310,220,465,270,BLUE,24)+line(475,220,330,270,RED,24)+line(350,340,250,470,BLUE,30)+line(350,340,390,475,BLUE,30)+line(440,340,550,470,RED,30)+line(440,340,405,475,RED,30)
    raise ValueError('No original diagram for '+name)

def main():
    refs=set()
    for file in (ROOT/'tools/src').glob('picture_*.txt'):
        for row in file.read_text(encoding='utf-8').splitlines():
            if row and not row.startswith('['):
                parts=row.split('|')
                if len(parts)>2 and parts[2].startswith('^'):refs.add(parts[2][1:])
    OUT.mkdir(exist_ok=True)
    for name in sorted(refs):
        art=draw(name)
        svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">'+rect(0,0,800,600,'#f4f7fb',0)+circle(400,300,245,'#e4edf6')+'<g>'+art+'</g></svg>'
        (OUT/(name+'.svg')).write_text(svg,encoding='utf-8')
    print(f'Built {len(refs)} original text-free prop and board diagrams')

if __name__=='__main__':main()
