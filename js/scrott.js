var hcc_group = initGroup();

while (hcc_group.size > 0) {
    for (person in hcc_group) {
        var pip = person.getNumberFromTheDie();
        if (pip == 1 || pip == 6) {
            person.takeAPresentFromTheTable();
            hcc_group.remove(person);
        }
        person.giveDieToNextPerson();
    }
}

hcc_group = initGroup();
for (person in hcc_group) {
    person.unpackPresent();
}

var time = system.getTime();
hcc_group = initGroup();

while (system.getTime() - time < 300000) {
    for (person in hcc_group) {
        var pip = person.getNumberFromTheDie();
        if (pip == 1 || pip == 6) {
            person.switchOwnPresentWithSomebody();
        } else if (pip == 2) {
            shiftPresentsToTheRight();
        } else if (pip == 5) {
            shiftPresentsToTheLeft();
        }
        person.giveDieToNextPerson();
    }
}
